import db from '../database';
import logger from './logger';
import { getUserRole } from '../auth/authState';

/**
 * GeÃ§ici drag & drop kayÄ±tlarÄ±nÄ± temizle
 * AkÄ±llÄ± limit sistemi ile maksimum 5 geÃ§ici plan tutar
 */
export const cleanupTempPlans = async () => {
  try {
    const role = await getUserRole();
    if (role !== 'admin') {
      logger.info('â„¹ï¸ GeÃ§ici plan temizliÄŸi yalnÄ±zca yÃ¶netici oturumlarÄ±nda Ã§alÄ±ÅŸÄ±r. Public oturum, iÅŸlem atlandÄ±.');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Public oturumda geÃ§ici plan temizliÄŸi yapÄ±lmadÄ±'
      };
    }

    logger.info('ğŸ§¹ GeÃ§ici planlar temizleniyor...');

    // TÃ¼m planlarÄ± al
    const allPlans = await db.getAllPlans();
    logger.info('ğŸ“‹ TÃ¼m planlar alÄ±ndÄ±:', allPlans.length);

    // GeÃ§ici planlarÄ± filtrele
    const tempPlans = allPlans.filter(plan => {
      // plan.id'yi string'e Ã§evir
      const planId = String(plan.id || '');
      const planName = String(plan.name || '');

      const isTemp = planName.includes('GeÃ§ici Plan') || planId.startsWith('temp_');
      logger.info(`ğŸ” Plan kontrolÃ¼: ${planId} - ${planName} - GeÃ§ici: ${isTemp}`);
      return isTemp;
    });

    logger.info(`ğŸ“Š ${tempPlans.length} geÃ§ici plan bulundu`);

    // AkÄ±llÄ± limit sistemi: Maksimum 5 geÃ§ici plan tut
    const MAX_TEMP_PLANS = 5;

    if (tempPlans.length > MAX_TEMP_PLANS) {
      // Tarihe gÃ¶re sÄ±rala (en yeni en son)
      const sortedTempPlans = tempPlans.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });

      // En yeni 5 planÄ± koru, diÄŸerlerini sil
      const plansToKeep = sortedTempPlans.slice(0, MAX_TEMP_PLANS);
      const plansToDelete = sortedTempPlans.slice(MAX_TEMP_PLANS);

      logger.info(`ğŸ—‘ï¸ ${plansToDelete.length} eski geÃ§ici plan silinecek (${plansToKeep.length} plan korunacak)`);

      for (const plan of plansToDelete) {
        try {
          await db.deletePlan(plan.id);
          logger.info(`âœ… Eski geÃ§ici plan silindi: ${plan.id}`);
        } catch (deleteError) {
          logger.error(`âŒ Plan silme hatasÄ± (${plan.id}):`, deleteError);
          // Tek plan silme hatasÄ± tÃ¼m iÅŸlemi durdurmasÄ±n
        }
      }

      logger.info(`âœ… ${plansToDelete.length} eski geÃ§ici plan temizlendi, ${plansToKeep.length} plan korundu`);

      return {
        success: true,
        deletedCount: plansToDelete.length,
        keptCount: plansToKeep.length,
        message: `${plansToDelete.length} eski geÃ§ici plan silindi, ${plansToKeep.length} plan korundu`
      };
    } else if (tempPlans.length > 1) {
      // Eski sistem: Sadece 1 plan tut (geriye dÃ¶nÃ¼k uyumluluk)
      const sortedTempPlans = tempPlans.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });

      const plansToDelete = sortedTempPlans.slice(1);

      logger.info(`ğŸ—‘ï¸ ${plansToDelete.length} plan silinecek (eski sistem)`);

      for (const plan of plansToDelete) {
        try {
          await db.deletePlan(plan.id);
          logger.info(`âœ… GeÃ§ici plan silindi: ${plan.id}`);
        } catch (deleteError) {
          logger.error(`âŒ Plan silme hatasÄ± (${plan.id}):`, deleteError);
        }
      }

      logger.info(`âœ… ${plansToDelete.length} geÃ§ici plan temizlendi`);

      return {
        success: true,
        deletedCount: plansToDelete.length,
        keptCount: 1,
        message: `${plansToDelete.length} geÃ§ici plan silindi, 1 plan korundu`
      };
    } else if (tempPlans.length === 1) {
      logger.info('â„¹ï¸ Sadece 1 geÃ§ici plan var, temizleme gerekmiyor');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 1,
        message: 'Sadece 1 geÃ§ici plan var, temizleme gerekmiyor'
      };
    } else {
      logger.info('â„¹ï¸ Temizlenecek geÃ§ici plan bulunamadÄ±');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Temizlenecek geÃ§ici plan bulunamadÄ±'
      };
    }

  } catch (error) {
    logger.error('âŒ GeÃ§ici planlar temizlenirken hata:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * GeÃ§ici plan oluÅŸturma stratejisini deÄŸiÅŸtir
 * Mevcut geÃ§ici planÄ± gÃ¼ncelle, yeni kayÄ±t oluÅŸturma
 * Otomatik temizlik ile birlikte Ã§alÄ±ÅŸÄ±r
 */
export const updateTempPlan = async (planData) => {
  try {
    // Mevcut geÃ§ici planÄ± bul
    const allPlans = await db.getAllPlans();
    const existingTempPlan = allPlans.find(plan => {
      const planId = String(plan.id || '');
      const planName = String(plan.name || '');
      return planName.includes('GeÃ§ici Plan') || planId.startsWith('temp_');
    });

    if (existingTempPlan) {
      // Mevcut geÃ§ici planÄ± gÃ¼ncelle
      const updatedPlan = {
        ...existingTempPlan,
        data: planData,
        date: new Date().toISOString(),
        totalStudents: planData.salon?.ogrenciler?.length || 0,
        salonCount: planData.tumSalonlar?.length || 1
      };

      await db.savePlan(updatedPlan);
      logger.info('ğŸ”„ Mevcut geÃ§ici plan gÃ¼ncellendi');

      // Otomatik temizlik kontrolÃ¼
      await autoCleanupIfNeeded();

      return updatedPlan;
    } else {
      // Yeni geÃ§ici plan oluÅŸtur
      const newTempPlan = {
        id: `temp_${Date.now()}`,
        name: 'GeÃ§ici Plan (Drag & Drop)',
        data: planData,
        date: new Date().toISOString(),
        totalStudents: planData.salon?.ogrenciler?.length || 0,
        salonCount: planData.tumSalonlar?.length || 1
      };

      await db.savePlan(newTempPlan);
      logger.info('âœ¨ Yeni geÃ§ici plan oluÅŸturuldu');

      // Otomatik temizlik kontrolÃ¼
      await autoCleanupIfNeeded();

      return newTempPlan;
    }
  } catch (error) {
    logger.error('âŒ GeÃ§ici plan gÃ¼ncellenirken hata:', error);
    throw error;
  }
};

/**
 * Salon duplikasyon temizliÄŸi - Tauri masaÃ¼stÃ¼ sÃ¼rÃ¼mÃ¼nde geÃ§erli deÄŸil
 * (Firestore kaldÄ±rÄ±ldÄ±, SQLite'da duplikasyon sorun oluÅŸturmaz)
 */
export const cleanupDuplicateSalons = async () => {
  return {
    success: true,
    deletedCount: 0,
    keptCount: 0,
    message: 'MasaÃ¼stÃ¼ uygulamasÄ±nda salon duplikasyon temizliÄŸi gerekli deÄŸil'
  };
};

/**
 * Otomatik temizlik kontrolÃ¼
 * GeÃ§ici plan sayÄ±sÄ± 5'i geÃ§erse otomatik temizlik yapar
 */
const autoCleanupIfNeeded = async () => {
  try {
    const allPlans = await db.getAllPlans();
    const tempPlans = allPlans.filter(plan => {
      const planId = String(plan.id || '');
      const planName = String(plan.name || '');
      return planName.includes('GeÃ§ici Plan') || planId.startsWith('temp_');
    });

    const MAX_TEMP_PLANS = 5;

    if (tempPlans.length > MAX_TEMP_PLANS) {
      logger.info(`ğŸ¤– Otomatik temizlik tetiklendi: ${tempPlans.length} > ${MAX_TEMP_PLANS}`);
      const result = await cleanupTempPlans();
      logger.info(`ğŸ¤– Otomatik temizlik tamamlandÄ±: ${result.deletedCount} plan silindi`);
    }
  } catch (error) {
    logger.error('âŒ Otomatik temizlik hatasÄ±:', error);
    // Otomatik temizlik hatasÄ± ana iÅŸlemi durdurmasÄ±n
  }
};

